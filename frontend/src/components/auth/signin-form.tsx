import { cn } from "../../lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { Link } from "react-router"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "../../stores/useAuthStore"
import { useNavigate } from "react-router";


const SigninSchema = z.object({
    username: z.string().min(6, "Tên đăng nhập phải có"),
    password: z.string().min(8, "Mật khẩu phải có"),
})

type signInFormValue = z.infer<typeof SigninSchema>

export function SigninForm({
    className,
    ...props
}: React.ComponentProps<"div">) {

    const { signIn } = useAuthStore();
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<signInFormValue>({
        resolver: zodResolver(SigninSchema),
    })
    const onSubmit = async (data: signInFormValue) => {
        const { username, password } = data;
        await signIn(username, password);
        navigate("/");
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h3 className="text-2xl font-bold">Đăng nhập PhotoSharing</h3>
                                <p className="text-muted-foreground text-sm text-balance">
                                    Chào mừng bạn! Hãy đăng nhập để bắt đầu!
                                </p>
                            </div>

                            <Field>
                                <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
                                <Input
                                    id="username"
                                    type="string"
                                    placeholder=""
                                    {...register("username")}
                                />
                                <FieldLabel>
                                    {errors.username && <p className="text-destructive text-sm">
                                        {errors.username.message}
                                    </p>}
                                </FieldLabel>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="password">Mật Khẩu</FieldLabel>
                                <Input id="password" type="password"  {...register("password")} />
                                <FieldLabel>
                                    {errors.password && <p className="text-destructive text-sm">
                                        {errors.password.message}
                                    </p>}
                                </FieldLabel>
                            </Field>


                            <Field>
                                <Button type="submit" disabled={isSubmitting}>Đăng nhập</Button>
                            </Field>

                            <FieldDescription className="text-center">
                                Chưa có tài khoản? <Link to="/signup" className="underline underline-offset-4">Đăng ký</Link>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                    <div className="bg-muted relative hidden md:block">
                        <img
                            src="/placeholderSignin.jpeg"
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="text-xs text-balance px-6 text-center">
                Bằng cách tiếp tục, bạn đồng ý với <a href="#">điều khoản dịch vụ</a>{" "}
                và <Link to="#">chính sách bảo mật</Link> của chúng tôi.
            </div>
        </div>
    )
}
